import resources from '@config/resources';
import { Resource, ResourceData } from '@interfaces/resource';
import { ResourceName } from '@interfaces/resource-name';
import 'dotenv';
import { useCallback, useEffect } from 'react';
import { useCrudHelper } from './use-crud-helpers';
import { useLocalStorage } from './use-localstorage.hook';
import { useShallow } from 'zustand/react/shallow';

export const useResource = (resource: ResourceName) => {
  const [resourceData, setData, setLoaded, setLoading] = useLocalStorage(
    useShallow((state) => [state.resourceData, state.setData, state.setLoaded, state.setLoading])
  );

  const getMany = (resources[resource] as Resource<ResourceData>).getMany;
  const { handleGetMany } = useCrudHelper(resource);

  const data = resourceData[resource]?.data ?? [];
  const loaded = resourceData[resource]?.loaded ?? false;
  const loading = resourceData[resource]?.loading ?? false;

  const refresh = useCallback(() => {
    if (getMany) {
      setLoading(resource, true);
      handleGetMany(getMany)
        .then((res) => {
          if (res) {
            setData(resource, res);
            setLoaded(resource, true);
          }
          setLoading(resource, false);
        })
        .catch(() => setLoading(resource, false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resource]);

  useEffect(() => {
    // Hämta alltid om vid montering — cachen renderas direkt medan färsk data
    // hämtas i bakgrunden. Den gamla `!loaded`-vakten gjorde cachen permanent för
    // hela webbläsarsessionen: en resurs som en gång lästs som tom förblev tom i
    // t.ex. gruppväljaren även när API:t hade data (import, andra vyer, andra flikar).
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resource]);

  return { data, loaded, loading, refresh };
};
