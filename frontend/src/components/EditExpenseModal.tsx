'use client';

import React, { useState } from 'react';
import { X, Trash2, AlertTriangle } from 'lucide-react';
import ReviewForm from './ReviewForm';

interface EditExpenseModalProps {
  expense: any;
  onClose: () => void;
  onUpdated: () => void;
  onDeleted: () => void;
}

export default function EditExpenseModal({ expense, onClose, onUpdated, onDeleted }: EditExpenseModalProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError('');
    try {
      const api = (await import('../lib/api')).default;
      await api.delete(`/api/expenses/${expense.id}`);
      onDeleted();
    } catch (err: any) {
      setDeleteError(err.response?.data?.message || 'Failed to delete expense.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative glass-panel rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto animate-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-foreground">Edit Expense</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-input transition-colors text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Edit Form — reuses ReviewForm in edit mode */}
        <ReviewForm 
          initialData={expense} 
          source={expense.createdBy || 'MANUAL'} 
          expenseId={expense.id}
          onSuccess={onUpdated}
        />

        {/* Divider */}
        <div className="border-t border-border my-6" />

        {/* Delete Section */}
        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full flex items-center justify-center gap-2 text-sm text-red-500 hover:text-red-400 hover:bg-red-500/10 py-2.5 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" /> Delete this expense
          </button>
        ) : (
          <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 space-y-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-700 dark:text-red-400">Are you sure?</p>
                <p className="text-xs text-muted-foreground mt-1">This expense will be removed from all views. An audit record will be preserved.</p>
              </div>
            </div>
            {deleteError && (
              <p className="text-xs text-red-500">{deleteError}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 text-sm py-2 rounded-lg bg-input hover:bg-black/5 dark:hover:bg-white/10 text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 text-sm py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
