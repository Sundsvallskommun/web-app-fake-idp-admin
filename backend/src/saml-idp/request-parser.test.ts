import { deflateRawSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { parseRequest } from './request-parser';

const encode = (xml: string): string => deflateRawSync(Buffer.from(xml)).toString('base64');
const maxBytes = 1024 * 1024;
const open =
  '<samlp:AuthnRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" ID="_request-1" AssertionConsumerServiceURL="https://sp.test/acs?a=1&amp;b=2">';
const close = '</samlp:AuthnRequest>';

describe('SAML AuthnRequest parsing', () => {
  it('preserves the destination, request ID and opaque RelayState', async () => {
    const relayState = 'https://sp.test/återvänd?a=1&b=%2F';
    await expect(
      parseRequest({ SAMLRequest: encode(`<?xml version="1.0" encoding="UTF-8"?>${open}Åäö${close}`), RelayState: relayState }),
    ).resolves.toEqual({
      protocol: 'saml',
      destination: 'https://sp.test/acs?a=1&b=2',
      inResponseTo: '_request-1',
      relayState,
    });
  });

  it('accepts XML at the 1 MiB inflated-byte boundary', async () => {
    const xml = open + ' '.repeat(maxBytes - Buffer.byteLength(open + close)) + close;
    await expect(parseRequest({ SAMLRequest: encode(xml) })).resolves.toMatchObject({ inResponseTo: '_request-1' });
  });

  it('rejects encoded input larger than 1 MiB before decoding', async () => {
    await expect(parseRequest({ SAMLRequest: 'A'.repeat(maxBytes + 1) })).rejects.toMatchObject({ status: 413 });
  });

  it.each([' ', 'å'])('rejects compressed XML exceeding the byte limit with %j content', async character => {
    const xml = open + character.repeat(Math.floor(maxBytes / Buffer.byteLength(character))) + close;
    const encoded = encode(xml);
    expect(encoded.length).toBeLessThan(maxBytes);
    await expect(parseRequest({ SAMLRequest: encoded })).rejects.toMatchObject({ status: 413 });
  });

  it('keeps malformed compressed input distinct from size-limit errors', async () => {
    await expect(parseRequest({ SAMLRequest: Buffer.from('not a deflate stream').toString('base64') })).rejects.toMatchObject({
      code: 'Z_DATA_ERROR',
    });
  });

  it('rejects a missing request', async () => {
    await expect(parseRequest({})).rejects.toThrow('Missing SAMLRequest');
  });
});
