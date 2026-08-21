import EmptyLayout from '@layouts/empty-layout/empty-layout.component';
import { Loader2 } from 'lucide-react';

export default function LoaderFullScreen() {
  return (
    <EmptyLayout title={`${process.env.NEXT_PUBLIC_APP_NAME} - Laddar`}>
      <main>
        <div className="w-screen h-screen flex place-items-center place-content-center">
          <Loader2 className="size-12 animate-spin text-muted-foreground" role="status" aria-label="Laddar information" />
        </div>
      </main>
    </EmptyLayout>
  );
}
