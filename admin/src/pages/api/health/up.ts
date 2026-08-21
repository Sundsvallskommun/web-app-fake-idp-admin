import type { NextApiRequest, NextApiResponse } from 'next';

const requireAuth = process.env.HEALTH_AUTH === 'true';
const authUsername = process.env.HEALTH_USERNAME;
const authPassword = process.env.HEALTH_PASSWORD;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { headers: resHeaders } = req;
  const { authorization } = resHeaders;
  if (requireAuth && (!authUsername || !authPassword)) {
    res.status(503).send('HEALTH_AUTH_MISCONFIGURED');
    return;
  }
  const userAuth64 = Buffer.from(`${authUsername}:${authPassword}`).toString('base64');

  if (requireAuth && authorization !== `Basic ${userAuth64}`) {
    res.status(401).send('NOT_AUTHORIZED');
    return;
  }

  res.status(200).send({ status: 'OK' });
}
