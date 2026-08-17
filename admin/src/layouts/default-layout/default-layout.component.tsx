import { Menu } from '@components/menu/menu';
import { Logo } from '@components/logo/logo';
import { LogoMark } from '@components/logo/logo-mark';
import { ModeToggle } from '@components/mode-toggle/mode-toggle';
import { Avatar, AvatarFallback } from '@components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@components/ui/dropdown-menu';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from '@components/ui/sidebar';
import { useUserStore } from '@services/user-service/user-service';
import { apiURL } from '@utils/api-url';
import { useTranslation } from 'next-i18next';
import Head from 'next/head';
import NextLink from 'next/link';
import { capitalize } from '@utils/capitalize';
import { ChevronsUpDown, ExternalLink, LogOut } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';

interface DefaultLayoutProps {
  children: React.ReactNode;
  title?: string;
  postTitle?: string;
  headerSubtitle?: string;
  logoLinkHref?: string;
}

export default function DefaultLayout({ title, postTitle, headerSubtitle, children }: DefaultLayoutProps) {
  const layoutTitle = `${process.env.NEXT_PUBLIC_APP_NAME} admin${headerSubtitle ? ` - ${headerSubtitle}` : ''}`;
  const fullTitle = postTitle ? `${layoutTitle} - ${postTitle}` : `${layoutTitle}`;
  const { t } = useTranslation();
  const user = useUserStore(useShallow((state) => state.user));

  const setFocusToMain = () => {
    const contentElement = document.getElementById('content');
    contentElement?.focus();
  };

  const initials = user.name
    .split(' ')
    .map((name) => name.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');

  return (
    <div className="DefaultLayout full-page-layout">
      <Head>
        <title>{title ? title : fullTitle}</title>
        <meta name="description" content={`${process.env.NEXT_PUBLIC_APP_NAME} admin`} />
      </Head>

      <NextLink href="#content" legacyBehavior passHref>
        <a onClick={setFocusToMain} accessKey="s" className="next-link-a" data-cy="systemMessage-a">
          {t('layout:header.goto_content')}
        </a>
      </NextLink>

      <SidebarProvider>
        <Sidebar collapsible="icon">
          <SidebarHeader>
            {/* Drakens mönster: LogoMark visas ENDAST i ikonläge, ordmärket ENDAST
                expanderat — aldrig båda, så märket dubbleras inte. */}
            <NextLink
              href="/"
              className="flex items-center overflow-hidden rounded-md p-1.5 hover:bg-sidebar-accent group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-1"
              aria-label={`${process.env.NEXT_PUBLIC_APP_NAME} – till startsidan`}
            >
              <LogoMark className="hidden h-8 w-auto shrink-0 text-sidebar-foreground group-data-[collapsible=icon]:block" />
              <Logo className="h-8 w-auto shrink-0 text-sidebar-foreground group-data-[collapsible=icon]:hidden" />
            </NextLink>
          </SidebarHeader>

          <SidebarContent>
            <Menu />
          </SidebarContent>

          <SidebarFooter>
            <SidebarMenu>
              <SidebarMenuItem>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton size="lg" tooltip={user.name}>
                      <Avatar className="size-8 rounded-lg">
                        <AvatarFallback className="rounded-lg text-xs">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="grid flex-1 text-left leading-tight">
                        <span className="truncate text-sm font-medium">{user.name}</span>
                      </div>
                      <ChevronsUpDown className="ml-auto size-4" />
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="top" align="start" className="w-(--radix-dropdown-menu-trigger-width)">
                    <DropdownMenuItem asChild>
                      <a href={apiURL('/saml/idp/login')} target="_blank" rel="noreferrer">
                        <ExternalLink className="size-4" />
                        IdP-testsession
                      </a>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <NextLink href="/logout">
                        <LogOut className="size-4" />
                        {capitalize(t('common:logout'))}
                      </NextLink>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>

          <SidebarRail />
        </Sidebar>

        {/* svh (inte vh): på mobil med dynamiskt adressfält är 100vh högre än synlig
            yta, så paginering m.m. hamnade bakom webbläsarens verktygsfält. */}
        <SidebarInset className="max-h-svh overflow-hidden">
          <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <div className="ml-auto">
              <ModeToggle />
            </div>
          </header>
          {/* Stacken kan frontas publikt — defaultlösenordet ska inte kunna
              glömmas kvar obemärkt. Flaggan kommer från backend via /me. */}
          {user.defaultCredentials && (
            <div
              role="alert"
              className="shrink-0 border-b border-yellow-300 bg-yellow-100 px-4 py-1.5 text-sm text-yellow-950 dark:border-yellow-700 dark:bg-yellow-900 dark:text-yellow-100"
            >
              {t('layout:default_credentials_warning')}
            </div>
          )}
          <div className="px-6 py-4 md:py-7 md:px-10 flex-1 min-h-0 overflow-y-auto">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
