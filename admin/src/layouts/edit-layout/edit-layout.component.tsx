import Link from 'next/link';
import DefaultLayout from '../default-layout/default-layout.component';
import Main from '../main/main.component';
 
import { buttonVariants } from '@components/ui/button';
import { cn } from '@utils/cn';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Header } from '@layouts/header/header.component';

interface EditLayoutProps {
  /**
   * href (url or path)
   */
  backLink?: string;
  title: string;
  headerInfo?: React.ReactNode;
  children?: React.ReactNode;
}

export const EditLayout: React.FC<EditLayoutProps> = (props) => {
  const { backLink, title, headerInfo, children } = props;
  const { t } = useTranslation();

  return (
    <DefaultLayout title={`${title} - ${process.env.NEXT_PUBLIC_APP_NAME}`}>
      <Main>
        <Header>
          <div className="flex gap-3 items-center">
            {backLink && (
              <Link
                href={backLink}
                className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'rounded-full')}
                aria-label={t('common:go_back')}
              >
                <ArrowLeft className="size-4" />
              </Link>
            )}

            <h1 className="text-3xl md:text-4xl font-bold mb-0">{title}</h1>
          </div>
          {headerInfo}
        </Header>
        {children}
      </Main>
    </DefaultLayout>
  );
};

export default EditLayout;
