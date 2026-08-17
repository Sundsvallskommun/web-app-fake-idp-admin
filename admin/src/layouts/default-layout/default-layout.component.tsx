import { Menu } from '@components/menu/menu';
import { useUserStore } from '@services/user-service/user-service';
import { apiURL } from '@utils/api-url';
import { Avatar, ColorSchemeMode, Icon, Logo, PopupMenu } from '@sk-web-gui/react';
import { useTranslation } from 'next-i18next';
import Head from 'next/head';
import NextLink from 'next/link';
import { capitalize } from '@utils/capitalize';
import { ChevronRight, Sun, Moon, Monitor, Check } from 'lucide-react';
import { useLocalStorage } from '@utils/use-localstorage.hook';
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
  const [colorScheme, setColorScheme] = useLocalStorage(
    useShallow((state) => [state.colorScheme, state.setColorScheme])
  );
  const { t } = useTranslation();
  const user = useUserStore(useShallow((state) => state.user));

  const setFocusToMain = () => {
    const contentElement = document.getElementById('content');
    contentElement?.focus();
  };

  const colorSchemeIcons: Record<ColorSchemeMode, React.JSX.Element> = {
    light: <Sun />,
    dark: <Moon />,
    system: <Monitor />,
  };

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

      <div className="flex w-full min-h-screen h-full">
        <nav className="flex flex-col justify-between p-24 shadow-100 bg-background-content min-h-full">
          <div className="flex flex-col gap-24">
            <NextLink href="/">
              <Logo title={process.env.NEXT_PUBLIC_APP_NAME} className="rounded-button" />
            </NextLink>
            <Menu />
          </div>
          <div className="relative flex flex-col w-full">
            <PopupMenu>
              <PopupMenu.Button variant="tertiary" showBackground={false} className="justify-start">
                <Avatar
                  initials={`${user.name
                    .split(' ')
                    .map((name) => name.charAt(0).toUpperCase())
                    .slice(0, 2)
                    .join('')}`}
                  size="sm"
                  rounded
                />
                {user.name}
              </PopupMenu.Button>
              <PopupMenu.Panel className="w-full" position="over">
                <PopupMenu.Items>
                  <PopupMenu.Group>
                    <PopupMenu.Item>
                      <PopupMenu>
                        <PopupMenu.Button rightIcon={<ChevronRight />} className="!justify-between">
                          <span className="flex gap-12">
                            {colorSchemeIcons[colorScheme]}
                            {capitalize(t('layout:color_scheme'))}
                          </span>
                        </PopupMenu.Button>
                        <PopupMenu.Panel>
                          <PopupMenu.Items>
                            {Object.keys(colorSchemeIcons).map((scheme) => (
                              <PopupMenu.Item key={`cs-${scheme}`}>
                                <button
                                  onClick={() => setColorScheme(scheme as ColorSchemeMode)}
                                  role="menuitemradio"
                                  aria-checked={scheme === colorScheme}
                                  className="!justify-between min-w-[20rem]"
                                >
                                  <span className="flex gap-12">
                                    {colorSchemeIcons[scheme as ColorSchemeMode]}
                                    {capitalize(t(`layout:color_schemes.${scheme}`))}
                                  </span>
                                  {scheme === colorScheme && <Icon.Padded size={18} rounded icon={<Check />} />}
                                </button>
                              </PopupMenu.Item>
                            ))}
                          </PopupMenu.Items>
                        </PopupMenu.Panel>
                      </PopupMenu>
                    </PopupMenu.Item>
                  </PopupMenu.Group>
                  <PopupMenu.Item>
                    <a href={apiURL('/saml/idp/login')} target="_blank" rel="noreferrer">
                      IdP-testsession
                    </a>
                  </PopupMenu.Item>
                  <PopupMenu.Item>
                    <NextLink href="/logout">{capitalize(t('common:logout'))}</NextLink>
                  </PopupMenu.Item>
                </PopupMenu.Items>
              </PopupMenu.Panel>
            </PopupMenu>
          </div>
        </nav>

        <div className="flex-grow relative w-full flex max-h-screen overflow-hidden">
          <div className="px-24 py-16 md:py-28 md:px-40 grow max-h-full overflow-y-scroll">{children}</div>
        </div>
      </div>
    </div>
  );
}
