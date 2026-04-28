import request from 'supertest';
import express from 'express';
import path from 'path';
import Layouts from 'express-ejs-layouts';
import { CreateEventController } from '../src/controller/EventController';
import { EventService } from '../src/service/EventService';
import { CreateRsvpService } from '../src/service/RsvpService';
import { createPrismaEventRepository, } from '../test/prismaRouteTestHelper';
import { CreateInMemoryRsvpRepository } from '../src/repository/InMemoryRsvpRepository';

async function run() {
  const app = express();
  app.use(express.urlencoded({ extended: true }));

  app.use((req, _res, next) => {
    (req as any).session = {
      app: {
        browserId: 'test-browser',
        browserLabel: 'Browser TEST',
        visitCount: 1,
        createdAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString(),
        authenticatedUser: {
          userId: 'user-reader',
          email: 'user@app.test',
          displayName: 'Una User',
          role: 'user'
        }
      }
    };
    next();
  });

  app.use(Layouts);
  app.set('view engine', 'ejs');
  app.set('views', path.join(process.cwd(), 'src/views'));
  app.set('layout', 'layouts/base');

  const eventRepository = createPrismaEventRepository();
  const rsvpRepository = CreateInMemoryRsvpRepository();
  const rsvpService = CreateRsvpService(rsvpRepository, eventRepository);
  const eventService = new EventService(eventRepository);
  const eventController = CreateEventController(eventService, rsvpService);

  app.get('/events/:id', async (req, res) => {
    const session = (req as any).session.app;

    if (!session?.authenticatedUser) {
      res.status(401).render('partials/error', {
        message: 'Please log in to continue.',
        layout: false,
      });
      return;
    }

    try {
      await eventController.showEventDetail(res, {
        eventId: req.params.id,
        actingUserId: session.authenticatedUser.userId,
        actingUserRole: session.authenticatedUser.role,
        session,
      });
    } catch (err) {
      console.error('Unhandled error in route:', err);
      res.status(500).send('server error');
    }
  });

  // add error handler to catch render errors
  app.use((err: any, _req: any, res: any, _next: any) => {
    console.error('Express error handler:', err && err.stack ? err.stack : err);
    res.status(500).send('express error');
  });

  const res = await request(app).get('/events/event-2');
  console.log('status', res.status);
  console.log('text snippet', res.text.slice(0, 400));
}

run().catch((e) => { console.error(e); process.exit(1); });
