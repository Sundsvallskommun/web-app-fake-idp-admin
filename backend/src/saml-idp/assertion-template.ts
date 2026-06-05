import { xmlEscape } from './util';

export interface AssertionAttribute {
  key: string;
  format: string;
  value: string;
  type: string;
}

export interface ResponseTemplateData {
  destination: string;
  id: string;
  inResponseTo: string;
  issueInstant: string;
  entity: string;
  assertionId: string;
  nameQualifier: string;
  spNameQualifier: string;
  address: string;
  notOnOrAfter: string;
  notBefore: string;
  audience: string;
  authnInstant: string;
  sessionIndex: string;
  nameId: string;
  attributes: AssertionAttribute[];
}

/**
 * Build the (unsigned) SAML Response XML.
 *
 * Ported verbatim in structure from fake-sso-idp's `auth-answer.xml` lodash
 * template, with two deliberate differences:
 *  - attributes are iterated from an ARRAY (Prisma `Attribute[]`) using `key`
 *    as the SAML attribute Name (the original used an object keyed by name);
 *  - every interpolated value is XML-escaped so admin-entered values can't
 *    corrupt the signed XML / digest.
 *  - SubjectConfirmationData Recipient is the actual destination (the original
 *    left it empty); node-saml and most SPs expect the ACS URL here.
 */
export function buildResponseXml(data: ResponseTemplateData): string {
  const attributes = data.attributes
    .map(
      attr =>
        `<saml2:Attribute Name="${xmlEscape(attr.key)}" NameFormat="${xmlEscape(attr.format)}">` +
        `<saml2:AttributeValue xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:type="${xmlEscape(attr.type)}">` +
        `${xmlEscape(attr.value)}</saml2:AttributeValue></saml2:Attribute>`,
    )
    .join('');

  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<saml2p:Response xmlns:saml2p="urn:oasis:names:tc:SAML:2.0:protocol" Destination="${xmlEscape(data.destination)}" ID="${xmlEscape(data.id)}" InResponseTo="${xmlEscape(data.inResponseTo)}" IssueInstant="${xmlEscape(data.issueInstant)}" Version="2.0">` +
    `<saml2:Issuer xmlns:saml2="urn:oasis:names:tc:SAML:2.0:assertion" Format="urn:oasis:names:tc:SAML:2.0:nameid-format:entity">${xmlEscape(data.entity)}</saml2:Issuer>` +
    `<saml2p:Status><saml2p:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success"/></saml2p:Status>` +
    `<saml2:Assertion xmlns:saml2="urn:oasis:names:tc:SAML:2.0:assertion" ID="${xmlEscape(data.assertionId)}" IssueInstant="${xmlEscape(data.issueInstant)}" Version="2.0" xmlns:xs="http://www.w3.org/2001/XMLSchema">` +
    `<saml2:Issuer Format="urn:oasis:names:tc:SAML:2.0:nameid-format:entity">${xmlEscape(data.entity)}</saml2:Issuer>` +
    `<saml2:Subject>` +
    `<saml2:NameID Format="urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified" NameQualifier="${xmlEscape(data.nameQualifier)}" SPNameQualifier="${xmlEscape(data.spNameQualifier)}">${xmlEscape(data.nameId)}</saml2:NameID>` +
    `<saml2:SubjectConfirmation Method="urn:oasis:names:tc:SAML:2.0:cm:bearer">` +
    `<saml2:SubjectConfirmationData Address="${xmlEscape(data.address)}" InResponseTo="${xmlEscape(data.inResponseTo)}" NotOnOrAfter="${xmlEscape(data.notOnOrAfter)}" Recipient="${xmlEscape(data.destination)}"/>` +
    `</saml2:SubjectConfirmation>` +
    `</saml2:Subject>` +
    `<saml2:Conditions NotBefore="${xmlEscape(data.notBefore)}" NotOnOrAfter="${xmlEscape(data.notOnOrAfter)}">` +
    `<saml2:AudienceRestriction><saml2:Audience>${xmlEscape(data.audience)}</saml2:Audience></saml2:AudienceRestriction>` +
    `</saml2:Conditions>` +
    `<saml2:AuthnStatement AuthnInstant="${xmlEscape(data.authnInstant)}" SessionIndex="${xmlEscape(data.sessionIndex)}">` +
    `<saml2:SubjectLocality Address="${xmlEscape(data.address)}"/>` +
    `<saml2:AuthnContext><saml2:AuthnContextClassRef>urn:oasis:names:tc:SAML:2.0:ac:classes:Kerberos</saml2:AuthnContextClassRef></saml2:AuthnContext>` +
    `</saml2:AuthnStatement>` +
    `<saml2:AttributeStatement>${attributes}</saml2:AttributeStatement>` +
    `</saml2:Assertion>` +
    `</saml2p:Response>`
  );
}
