import { Badge } from '@/components/ui/badge';

interface StatusRowProps {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  ok?: boolean;
  isText?: boolean;
  last?: boolean;
}

export function StatusRow({ icon: Icon, label, value, ok, isText, last }: StatusRowProps) {
  return (
    <div className={`flex items-center justify-between py-2.5 ${last ? '' : 'border-b'}`}>
      <span className="text-sm text-muted-foreground flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4" />}
        {label}
      </span>
      {isText ? (
        <span className="text-sm font-medium font-mono">{value}</span>
      ) : (
        <Badge variant={ok ? 'default' : 'secondary'}>{value}</Badge>
      )}
    </div>
  );
}
