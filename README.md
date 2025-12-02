## LDES serve feed service
Microservice to host an LDES feed based on files using the [@lblod/ldes-producer library](https://github.com/lblod/ldes-producer).

## Getting started
Add the service to your `docker-compose.yml`

``` yaml
services:
  ldes-serve-feed:
    image: lblod/ldes-serve-feed-service:0.3.0
    volumes:
      - ./data/ldes:/data
```

## How to guides
### How to organize files to host an LDES feed
Each feed is represented by a subdirectory in `/data`. Each subdirectory may contain other subdirectories and Turtle files. The Turtle files represent the nodes/pages of the LDES feed. The files must be named with an number as filename (`1.ttl`, `2.ttl`, `3.ttl`, ...), starting at 1.

Hence, the folder structure looks as follows:
```
/data
 |-- my-first-feed
   |-- 1.ttl
   |-- 2.ttl
   |-- 3.ttl
   |-- 4.ttl
   ...
 |-- another-feed
   |-- my-subdir
     |-- 1.ttl
     |-- 2.ttl
     |-- 3.ttl
   ...
```

### How to use relative relation links in the LDES feed
If the LDES feed uses relative relation links to refer to previous/next pages, the service will resolve those URLs when serving the pages. Therefore, the `BASE_URL` environment variable must be configured with be base URL the LDES feed is hosted on.

For example, if your stack is running on `https://my-app.example.com` and the dispatcher is configured to forward all paths starting with `ldes/` to this service, `BASE_URL` must be set to `https://my-app.example.com/ldes/`. A relative relation URL like `<./3>` will resolve to `https://my-app.example.com/ldes/3` when the page is served.

## Reference
### Configuration
The following environment variables can be configured on the service
- **`BASE_URL`** (optional, default: `http://localhost/`): base URL the feed is hosted on. Required to resolve relative URLs.
- **`AUTHENTICATED_LDES_FEED`** (optional, default: `false`): weither or not the ldes feed requires authentication.
- **`SESSION_GRAPH`** (optional, default: `http://mu.semte.ch/graphs/sessions`): session graph.

### API
#### GET /:folder*/:node
Get the given node from a folder. Folder may be a nested directory.

Data format can be requested via the `Accept` header. The following formats are supported:
- `application/ld+json`
- `application/n-quads`
- `application/n-triples`
- `application/trig`
- `text/n3`
- `text/turtle`

Returns 200 OK with the node in the response body on success.

Returns 404 Not Found if the feed or node doesn't exist.
