import { app, errorHandler } from 'mu';
import bodyParser from 'body-parser';
import {
  getLastPage,
  getNode as getNodeFn,
  getConfigFromEnv,
  ACCEPTED_CONTENT_TYPES,
} from '@lblod/ldes-producer';

app.use(
  bodyParser.json({
    limit: "500mb",
    type: function (_) {
      return true;
    },
  })
);

if (!process.env.BASE_URL) {
  throw new Error('Please set the "BASE_URL" environment variable');
}

if (!process.env.BASE_URL.endsWith("/")) {
  process.env.BASE_URL += "/";
}

const config = getConfigFromEnv();

const ENABLE_BASIC_AUTH = process.env.ENABLE_BASIC_AUTH === 'true' ? true : false;
const BASIC_AUTH_USERNAME = process.env.BASIC_AUTH_USERNAME || 'username';
const BASIC_AUTH_PASSWORD = process.env.BASIC_AUTH_PASSWORD || 'password';
const BASIC_AUTH_FOLDERS = process.env.BASIC_AUTH_FOLDERS && JSON.parse(process.env.BASIC_AUTH_FOLDERS);

const basicAuthMiddleware = (req, res, next) => {
  const segments = req.params[0]?.split('/');
  const folder = segments?.[0];
  if(!folder){
    res.status(404).send();
  }
  const shouldUseBasicAuth = ENABLE_BASIC_AUTH && (!BASIC_AUTH_FOLDERS || BASIC_AUTH_FOLDERS.includes(folder));
  if (shouldUseBasicAuth) {
    if (req.headers.authorization?.startsWith('Basic ')) {
      const b64value = req.headers.authorization.split(' ')[1];
      const [username, password] = Buffer.from(b64value, 'base64')
        .toString()
        .split(':');
      if (username === BASIC_AUTH_USERNAME && password === BASIC_AUTH_PASSWORD) {
        return next();
      }
    }
    return res.status(401).send('Authentication failed.');
  }
  return next();
};

app.get('/*', basicAuthMiddleware, async function (req, res, next) {
  try {
    const contentType = req.accepts(ACCEPTED_CONTENT_TYPES) || '';

    let folder, resource, nodeId;
    const segments = req.params[0].split('/');
    if (segments.length >= 1) {
      folder = segments[0];

      if (segments.length > 1) {
        nodeId = parseInt(segments[segments.length - 1]);

        if (segments.length > 2) {
          resource = segments.slice(1, segments.length - 1).join('/');
        } else {
          resource = '';
        }
      } else {
        // Node id not specified, redirect to last page
        nodeId = await getLastPage(config, folder);
      }

      if (isNaN(nodeId) || nodeId <= 0) {
        res.status(400).send({
          errors: [{
            title: 'Invalid node ID',
            description: 'Node ID must be a strictly positive integer'
          }]
        })
      } else {
        const node = await getNodeFn(config, {
          folder,
          contentType: contentType,
          nodeId,
          resource,
        });

        if (node.fromCache) {
          res.header('Cache-Control', 'public, immutable');
        }

        res.header('Content-Type', contentType);

        node.stream.pipe(res);
      }
    } else {
      res.status(404).send();
    }
  } catch (e) {
    return next(e);
  }
});

app.use(errorHandler);
