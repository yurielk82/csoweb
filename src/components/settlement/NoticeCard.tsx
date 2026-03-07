import { AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface NoticeCardProps {
  content: string;
  replaceVars: (text: string) => string;
}

export function NoticeCard({ content, replaceVars }: NoticeCardProps) {
  if (!content) return null;

  return (
    <Card className="border-warning/20 bg-warning/10">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2 text-warning">
          <AlertCircle className="h-4 w-4" />
          Notice
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-foreground">
        <div className="whitespace-pre-line">
          {replaceVars(content)}
        </div>
      </CardContent>
    </Card>
  );
}
