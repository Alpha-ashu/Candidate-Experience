import { Badge } from '../ui/badge';

interface StatusLightProps {
  status: 'pass' | 'warning' | 'fail';
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function StatusLight({ status, label, size = 'md' }: StatusLightProps) {
  const sizeMap = {
    sm: 'h-2 w-2',
    md: 'h-3 w-3',
    lg: 'h-4 w-4'
  };

  const colorMap = {
    pass: 'bg-green-500',
    warning: 'bg-yellow-500',
    fail: 'bg-red-500'
  };

  const labelMap = {
    pass: 'Good Standing',
    warning: 'Warning',
    fail: 'Violation'
  };

  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-sm text-slate-400">{label}:</span>}
      <div className={`${sizeMap[size]} rounded-full ${colorMap[status]} animate-pulse`} />
      <span className="text-sm text-white">{labelMap[status]}</span>
    </div>
  );
}
