import { createGroupAttribute, groupNamesFromAttributes, parseGroupNames, withoutGroupAttributes } from './group-claim';

const attribute = (key: string, value: string) => ({ key, value, format: 'basic', type: 'xs:string' });

describe('group claim adapter', () => {
  it('parses, trims, and de-duplicates the legacy comma-separated value', () => {
    expect(parseGroupNames('editor, reviewer,editor')).toEqual(['editor', 'reviewer']);
  });

  it('separates group membership from ordinary SAML attributes', () => {
    const attributes = [attribute('givenName', 'Test'), attribute('groups', 'editor,reviewer')];

    expect(groupNamesFromAttributes(attributes)).toEqual({ found: true, names: ['editor', 'reviewer'] });
    expect(withoutGroupAttributes(attributes)).toEqual([attribute('givenName', 'Test')]);
  });

  it('serializes membership using the established SAML representation', () => {
    expect(createGroupAttribute(['editor', 'reviewer'])).toEqual({
      key: 'groups',
      value: 'editor,reviewer',
      format: 'urn:oasis:names:tc:SAML:2.0:attrname-format:basic',
      type: 'xs:string',
    });
    expect(createGroupAttribute([])).toBeUndefined();
  });
});
