import resources from '@config/resources';
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@components/ui/collapsible';
import { ChevronRight } from 'lucide-react';
import NextLink from 'next/link';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import { capitalize } from '@utils/capitalize';

export const Menu = () => {
  const { t } = useTranslation();
  const router = useRouter();

  // router.asPath är basePath-relativ, till skillnad från window.location.pathname
  // som den tidigare MenuVertical-varianten läste av.
  const path = router.asPath.split('?')[0];
  const isActive = (name: string) => path === `/${name}` || path.startsWith(`/${name}/`);

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{capitalize(t('common:resources'))}</SidebarGroupLabel>
      <SidebarMenu>
        {Object.keys(resources).map((resourcename) => {
          const resource = resources[resourcename as keyof typeof resources];
          const active = isActive(resource.name);

          return (
            <Collapsible key={resource.name} asChild defaultOpen={active} className="group/collapsible">
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton isActive={active} tooltip={capitalize(t(`${resource.name}:name_many`))}>
                    <span>{capitalize(t(`${resource.name}:name_many`))}</span>
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild isActive={path === `/${resource.name}`}>
                        <NextLink href={`/${resource.name}`}>
                          {capitalize(t('common:list_all', { resource: t(`${resource.name}:name_many`) }))}
                        </NextLink>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    {resource?.create && (
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild isActive={path === `/${resource.name}/new`}>
                          <NextLink href={`/${resource.name}/new`}>
                            {capitalize(t('common:create_new', { resource: t(`${resource.name}:name_one`) }))}
                          </NextLink>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    )}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
};
