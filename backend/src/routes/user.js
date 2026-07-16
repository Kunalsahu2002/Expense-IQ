const { Router } = require("express");
const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");
const { upload } = require("../config/multer");
const { authenticate } = require("../middleware/auth");
const AppError = require("../utils/AppError");

const prisma = new PrismaClient();
const router = Router();

// Apply auth middleware to all user routes
router.use(authenticate);

/**
 * PUT /api/user/profile
 * Update user's profile info (firstName, lastName, avatar)
 */
router.put("/profile", upload.single("avatar"), async (req, res, next) => {
  try {
    const { firstName, lastName } = req.body;
    const updateData = {};

    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (req.file) {
      // Store relative URL path
      updateData.avatarUrl = `/uploads/${req.file.filename}`;
    }

    // Update the existing 'name' field for backward compatibility
    if (firstName || lastName) {
      const user = await prisma.user.findUnique({ where: { id: req.user.id } });
      const currentFirst = firstName || user.firstName || "";
      const currentLast = lastName || user.lastName || "";
      updateData.name = `${currentFirst} ${currentLast}`.trim() || user.name;
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
    });

    res.status(200).json({
      message: "Profile updated successfully",
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        avatarUrl: updatedUser.avatarUrl,
        role: updatedUser.role,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/user/security/password
 * Update user's password
 */
router.put("/security/password", async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new AppError("Both current and new passwords are required.", 400);
    }
    if (newPassword.length < 8) {
      throw new AppError("New password must be at least 8 characters long.", 400);
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);

    if (!isMatch) {
      throw new AppError("Incorrect current password.", 401);
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: req.user.id },
      data: { passwordHash: newPasswordHash },
    });

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/user/account
 * Delete user account and cascade all associated data
 */
router.delete("/account", async (req, res, next) => {
  try {
    // Due to 'onDelete: Cascade' in schema.prisma, this will delete all related records
    await prisma.user.delete({
      where: { id: req.user.id },
    });

    res.status(200).json({ message: "Account deleted successfully" });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
