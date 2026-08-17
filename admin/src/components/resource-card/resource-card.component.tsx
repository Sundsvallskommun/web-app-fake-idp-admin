import { ResourceName } from '@interfaces/resource-name';
import { Card, CardContent } from '@components/ui/card';
import { useResource } from '@utils/use-resource';
import { Loader2 } from 'lucide-react';
import NextLink from 'next/link';
import { useTranslation } from 'react-i18next';
import { capitalize } from '@utils/capitalize';

interface ResourceCardProps {
  resource: ResourceName;
}

export const ResourceCard: React.FC<ResourceCardProps> = ({ resource }) => {
  // useResource hämtar själv om vid montering.
  const { data, loading } = useResource(resource);
  const { t } = useTranslation();

  return (
    <Card className="transition-colors hover:bg-accent hover:text-accent-foreground">
      <NextLink href={`/${resource}`} className="block">
        <CardContent className="py-4">
          <h2 className="text-lg md:text-xl font-bold">{capitalize(t(`${resource}:name_many`))}</h2>
          <div className="flex gap-3 py-2">
            <span className="text-muted-foreground text-sm h-6">
              {loading ?
                <Loader2 className="size-4 animate-spin" aria-label={t('common:loading', { defaultValue: 'Laddar' })} />
              : <>
                  <strong>{data.length}</strong> {t(`${resource}:name`, { count: data.length })}
                </>
              }
            </span>
          </div>
        </CardContent>
      </NextLink>
    </Card>
  );
};
