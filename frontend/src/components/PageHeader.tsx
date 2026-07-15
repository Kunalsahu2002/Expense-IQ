import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle: React.ReactNode;
  children?: React.ReactNode;
}

export default function PageHeader({ title, subtitle, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-1">{title}</h1>
        <p className="text-muted-foreground">{subtitle}</p>
      </div>
      {children && <div>{children}</div>}
    </div>
  );
}
