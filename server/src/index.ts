import { PrismaClient } from '@prisma/client';
import { createApp } from './app';

const port = Number(process.env.PORT) || 3000;

createApp(new PrismaClient()).listen(port, () => {
  console.log(`Gamlify server listening on port ${port}`);
});
