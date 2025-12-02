import { app, errorHandler, query, sparqlEscapeUri } from 'mu';
import bodyParser from 'body-parser';
import {
  getLastPage,
  getNode as getNodeFn,
  getConfigFromEnv,
  ACCEPTED_CONTENT_TYPES,
} from '@lblod/ldes-producer';

const HEADER_MU_SESSION_ID = "mu-session-id";
const SESSION_GRAPH = process.env.SESSION_GRAPH || "http://mu.semte.ch/graphs/sessions";
const AUTHENTICATED_LDES_FEED = (process.env.AUTHENTICATED_LDES_FEED || "false").toLowerCase() === "true";

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

app.get('/*', async function (req, res, next) {
  try {
    
    if(AUTHENTICATED_LDES_FEED) {
      const sessionId = req.get(HEADER_MU_SESSION_ID);
      if(!sessionId) {
        return res.status(401).send();
      }
      const askQuery = `
      PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
      PREFIX session: <http://mu.semte.ch/vocabularies/session/>
      PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
      PREFIX dcterms: <http://purl.org/dc/terms/>
      ASK {
          GRAPH <${SESSION_GRAPH}> {
              ${sparqlEscapeUri(sessionId)} session:account ?account.
          }
      }`;
      const response = await query(askQuery, {sudo: true});
      if(!response.boolean) {
        return res.status(401).send();
      }
    }

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
