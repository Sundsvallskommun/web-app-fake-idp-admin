import resources from '@config/resources';
import { Resource, ResourceData } from '@interfaces/resource';
import { ResourceName } from '@interfaces/resource-name';
import { useCallback, useEffect } from 'react';
import { useCrudHelper } from './use-crud-helpers';
import { useLocalStorage } from './use-localstorage.hook';
import { useShallow } from 'zustand/react/shallow';

/**
 * Pågående hämtningar, per resurs. Medvetet i minnet (inte i zustand-storen):
 * storen persisteras till sessionStorage, och en sidladdning mitt i en hämtning
 * skulle lämna en persisterad flagga fast på true — då hämtar inget någonsin igen.
 */
const inFlight = new Set<ResourceName>();

export const useResource = (resource: ResourceName) => {
  const [resourceData, setData, setLoaded, setLoading, setError] = useLocalStorage(
    useShallow((state) => [state.resourceData, state.setData, state.setLoaded, state.setLoading, state.setError])
  );

  const getMany = (resources[resource] as Resource<ResourceData>).getMany;
  const { handleGetMany } = useCrudHelper(resource);

  const data = resourceData[resource]?.data ?? [];
  const loaded = resourceData[resource]?.loaded ?? false;
  const loading = resourceData[resource]?.loading ?? false;
  const error = resourceData[resource]?.error ?? false;

  const refresh = useCallback(() => {
    if (!getMany || inFlight.has(resource)) {
      return;
    }
    inFlight.add(resource);
    setLoading(resource, true);
    handleGetMany(getMany)
      .then((res) => {
        if (res) {
          setData(resource, res);
          setLoaded(resource, true);
          setError(resource, false);
        } else {
          // handleGetMany fångar felet och visar en toast; markera tillståndet
          // så listorna kan visa en feltyta istället för att se tomma ut.
          setError(resource, true);
        }
      })
      .catch(() => setError(resource, true))
      .finally(() => {
        inFlight.delete(resource);
        setLoading(resource, false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resource]);

  useEffect(() => {
    // Hämta alltid om vid montering — cachen renderas direkt medan färsk data
    // hämtas i bakgrunden. En `!loaded`-vakt här gjorde tidigare cachen permanent
    // för hela webbläsarsessionen. Parallella montörer dedupas via inFlight.
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resource]);

  return { data, loaded, loading, error, refresh };
};
