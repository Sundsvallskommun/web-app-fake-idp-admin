import { ResourceResponse } from '@interfaces/resource';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { capitalize } from '@utils/capitalize';

export const useCrudHelper = (resource: string) => {
  const { t } = useTranslation();

  const handleGetOne = async <TData = unknown>(getOne: () => ResourceResponse<TData>): Promise<TData | undefined> => {
    const name = t(`${resource}:name_one`);
    try {
      const result = await getOne();
      return Promise.resolve(result.data.data);
    } catch {
      toast.error(capitalize(t('crud:get_one.error', { resource: name })));
    }
  };

  const handleGetMany = async <TData = unknown>(
    getMany: () => ResourceResponse<TData[]>
  ): Promise<TData[] | undefined> => {
    const name = t(`${resource}:name_many`);
    try {
      const result = await getMany();
      return Promise.resolve(result.data.data);
    } catch {
      toast.error(capitalize(t('crud:get_one.error', { resource: name })));
    }
  };

  const handleCreate = async <TData = unknown>(create: () => ResourceResponse<TData>): Promise<TData | undefined> => {
    const name = t(`${resource}:name_one`);
    try {
      const result = await create();
      if (result) {
        toast.success(capitalize(t('crud:create.success', { resource: name })));
        return Promise.resolve(result.data.data);
      }
    } catch {
      toast.error(t('crud:create.error', { resource: name }));
    }
  };

  const handleUpdate = async <TData = unknown>(update: () => ResourceResponse<TData>): Promise<TData | undefined> => {
    const name = t(`${resource}:name_one`);
    try {
      const result = await update();
      if (result) {
        toast.success(capitalize(t('crud:update.success', { resource: name })));
        return Promise.resolve(result.data.data);
      }
    } catch {
      toast.error(capitalize(t('crud:update.error', { resource: name })));
    }
  };

  // Boolean, inte svarskroppen: de genererade delete-endpointsen är typade
  // AxiosResponse<void>, och ingen anropare använder mer än utfallet.
  const handleRemove = async (remove: () => Promise<unknown>): Promise<boolean> => {
    const name = t(`${resource}:name_one`);
    try {
      await remove();
      toast.success(capitalize(t('crud:remove.success', { resource: name })));
      return true;
    } catch {
      toast.error(capitalize(t('crud:remove.error', { resource: name })));
      return false;
    }
  };

  return { handleGetOne, handleGetMany, handleCreate, handleUpdate, handleRemove };
};
