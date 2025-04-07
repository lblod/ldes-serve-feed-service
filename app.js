
import { app, errorHandler } from 'mu';
import bodyParser from 'body-parser';
import {
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

if (!process.env.BASE_UR) {
  throw new Error('Please set the "BASE_URL" environment variable');
}

if (!process.env.BASE_URL.endsWith("/")) {
  process.env.BASE_URL += "/";
}

const config = getConfigFromEnv();

app.get('/:folder*/:nodeId', async function (req, res, next) {
  try {
    const contentType = req.accepts(ACCEPTED_CONTENT_TYPES) || '';

    const result = await getNodeFn(config, {
      folder: req.params.folder,
      contentType: contentType,
      nodeId: parseInt(req.params.nodeId ?? '1'),
      resource: req.params[0] || '',
    });

    if (result.fromCache) {
      res.header('Cache-Control', 'public, immutable');
    }

    res.header('Content-Type', contentType);

    result.stream.pipe(res);
  } catch (e) {
    return next(e);
  }
});

app.use(errorHandler);
