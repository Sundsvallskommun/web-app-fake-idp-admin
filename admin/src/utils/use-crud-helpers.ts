import { ResourceResponse } from '@interfaces/resource';
import { useSnackbar } from '@sk-web-gui/react';
import { useTranslation } from 'react-i18next';
import { capitalize } from '@utils/capitalize';

export const useCrudHelper = (resource: string) => {
  const message = useSnackbar();
  const { t } = useTranslation();

  const handleGetOne = async <TData = unknown>(getOne: () => ResourceResponse<TData>): Promise<TData | undefined> => {
    const name = t(`${resource}:name_one`);
    try {
      const result = await getOne();
      return Promise.resolve(result.data.data);
    } catch {
      message({ message: capitalize(t('crud:get_one.error', { resource: name })), status: 'error' });
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
      message({ message: capitalize(t('crud:get_one.error', { resource: name })), status: 'error' });
    }
  };

  const handleCreate = async <TData = unknown>(create: () => ResourceResponse<TData>): Promise<TData | undefined> => {
    const name = t(`${resource}:name_one`);
    try {
      const result = await create();
      if (result) {
        message({ message: capitalize(t('crud:create.success', { resource: name })), status: 'success' });
        return Promise.resolve(result.data.data);
      }
    } catch {
      message({ message: t('crud:create.error', { resource: name }), status: 'error' });
    }
  };

  const handleUpdate = async <TData = unknown>(update: () => ResourceResponse<TData>): Promise<TData | undefined> => {
    const name = t(`${resource}:name_one`);
    try {
      const result = await update();
      if (result) {
        message({ message: capitalize(t('crud:update.success', { resource: name })), status: 'success' });
        return Promise.resolve(result.data.data);
      }
    } catch {
      message({ message: capitalize(t('crud:update.error', { resource: name })), status: 'error' });
    }
  };

  const handleRemove = async <TData = unknown>(remove: () => ResourceResponse<TData>): Promise<TData | undefined> => {
    const name = t(`${resource}:name_one`);
    try {
      const result = await remove();
      if (result) {
        message({ message: capitalize(t('crud:remove.success', { resource: name })), status: 'success' });
        return Promise.resolve(result.data.data);
      }
    } catch {
      message({ message: capitalize(t('crud:remove.error', { resource: name })), status: 'error' });
    }
  };

  return { handleGetOne, handleGetMany, handleCreate, handleUpdate, handleRemove };
};
