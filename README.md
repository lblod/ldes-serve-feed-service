## Ldes serve feed service

### serve ldes feed using @lblod/ldes-producer npm library.

### usage:

```
  ldes-serve-feed:
    image: lblod/ldes-serve-feed-service
    environment:
      BASE_URL: "https://dev-vlag.roadsigns.lblod.info/"
      LDES_STREAM_PREFIX: "http://data.lblod.info/streams/op/"
      TIME_TREE_RELATION_PATH: "http://www.w3.org/ns/prov#generatedAtTime"
      DATA_FOLDER: "/ldes/ldes-feed"
      LDES_FOLDER: "ldes-mow-register"
    volumes:
      - ./data/ldes-feed:/ldes/ldes-feed
    restart: always
```
