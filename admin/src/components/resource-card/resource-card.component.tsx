import { ResourceName } from '@interfaces/resource-name';
import { Card, Spinner } from '@sk-web-gui/react';
import { useResource } from '@utils/use-resource';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { capitalize } from 'underscore.string';

interface ResourceCardProps {
  resource: ResourceName;
}

export const ResourceCard: React.FC<ResourceCardProps> = ({ resource }) => {
  const { data, loaded, loading, refresh } = useResource(resource);
  const { t } = useTranslation();

  useEffect(() => {
    if (!loaded) {
      refresh();
    }
  }, [loaded, refresh]);

  return (
    <Card
      layout="horizontal"
      href={`${process.env.NEXT_PUBLIC_BASE_PATH}/${resource}`}
      useHoverEffect
      color="vattjom"
      invert
    >
      <Card.Body className="py-16">
        <Card.Header>
          <h2 className="text-h4-sm md:text-h4-md xl:text-h4-lg">{capitalize(t(`${resource}:name_many`))}</h2>
        </Card.Header>
        <Card.Text className="flex gap-12 py-8">
          <span className="text-dark-secondary text-small h-24">
            {loading ?
              <Spinner size={1.5} className="leading-small" />
            : <>
                <strong>{data.length}</strong> {t(`${resource}:name`, { count: data.length })}
              </>
            }
          </span>
        </Card.Text>
      </Card.Body>
    </Card>
  );
};
