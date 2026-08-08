# Remote snapshot API

Périclès Initiative keeps all of its content in the browser's `localStorage`, under the
`pericles:overlay` key. That makes a cleared browser profile a total loss, and moving content between
two machines a manual file transfer. This document specifies the optional HTTP service the site can
back up to and restore from.

It is a contract and nothing more. Any HTTP server able to store and return a JSON document satisfies
it, and how a given server does so is out of scope here.

The service is **optional in the strong sense**. Until a base url is configured on the `/data` page,
no network request is ever made, no configuration key is written, and every feature of the site
behaves exactly as it did before. Working from `localStorage` alone is a first class mode, not a
degraded one.

## Scope

- Store one JSON snapshot of the whole wiki, and return it on demand.
- The snapshot is the complete dataset: `meta`, `categories`, `entries`, `live`. It is byte for byte
  the file the export button already downloads as `wiki.json`.
- Every transfer is a whole snapshot, and every write replaces the previous one entirely.
- Every transfer is triggered by a human clicking a button.

## Non-goals

The following are explicitly out of scope, and a server must not attempt them:

- **No per item API.** There is no endpoint for a single page, category or live item. The unit of
  transfer is the dataset.
- **No merging at all.** Neither side merges: a transfer replaces the destination entirely, in both
  directions. The server stores bytes.
- **No users, roles or sessions.** The site has no notion of identity, and this service does not
  introduce one. See [Secret](#secret).
- **No schema validation.** The client normalises everything it reads, so a server that rejects an
  unfamiliar field only breaks forward compatibility. Store the document as received.
- **No push from the server.** The site is statically generated and has no runtime of its own. It
  cannot be notified, only asked.

## Client configuration

Configuration lives in `localStorage` under `pericles:remote`, and the key is absent until the user
fills the form. Two fields are user facing:

| Field    | Meaning                                                    | Required |
| -------- | ---------------------------------------------------------- | -------- |
| Base url | Absolute `http` or `https` origin and path prefix           | yes      |
| Secret   | Sent as the `X-Pericles-Secret` header when non empty       | no       |

The client also remembers, without ever showing them as editable, the last revision it saw and the
timestamps of the last push and pull.

Given a base url of `https://node-red.example/pericles`, the dataset endpoint is
`https://node-red.example/pericles/dataset`. A trailing slash on the base url is tolerated.

## The contract

Every request must receive a response. The client abandons one after fifteen seconds and reports a
network failure, which it cannot tell apart from an unreachable host, so a server that holds a
connection open rather than answering is indistinguishable from a server that is down.

### `GET {baseUrl}/dataset`

Returns the stored snapshot.

**Response `200`.** A JSON body in either of two accepted shapes. A server picks one and stays
consistent:

Bare, which is what a statically served JSON file already produces:

```json
{
    "meta": { "universe": "…", "version": "1.0.0", "…": "…" },
    "categories": [],
    "entries": [],
    "live": []
}
```

Enveloped, when the server tracks its own revisions:

```json
{
    "revision": "7",
    "updatedAt": "2026-08-08T09:12:44.108Z",
    "dataset": {
        "meta": { "…": "…" },
        "categories": [],
        "entries": [],
        "live": []
    }
}
```

The client detects the envelope by the presence of a `dataset` object, and normalises whatever it
finds inside. Unknown top level keys are ignored, and the envelope's `revision` is informational:
only the `ETag` header can be replayed as `If-Match`, so only it drives conditional writes.

An `ETag` response header is optional but recommended. See [Concurrency](#concurrency).

**Response `404`.** No snapshot has been stored yet. This is a legitimate state, not a failure: the
client reports that there is nothing to restore and leaves the local content untouched.

### `PUT {baseUrl}/dataset`

Replaces the stored snapshot.

**Request.** `Content-Type: application/json`, and a body that is exactly the client's export: a bare
`Dataset` object, pretty printed with four spaces and a trailing newline. The client never sends the
envelope shape. A server that wants to store a revision alongside the document wraps it itself.

**Response `200`, `201` or `204`.** Any of the three is accepted. If the response carries an `ETag`,
the client remembers it as the current revision, which lets the next write be conditional. A body, if
any, is ignored.

**Response `412`.** The conditional write failed, meaning the stored snapshot changed since the
client last read it. See [Concurrency](#concurrency).

**Response `404` or `405`.** Not a contract state, but the two answers a server gives when it does
not implement this method at this path. The client reports them as a missing endpoint rather than as a
missing snapshot: on a write, `404` cannot mean "there is nothing stored yet", since storing something
is exactly what was asked. Node-RED in particular answers `404`, not `405`, when no `http in` node
matches the method, so a flow that only wires up the `GET` branch fails here.

**Response `413`.** The body was too large. The whole dataset shares the browser's `localStorage`
quota of roughly five megabytes, so a snapshot cannot realistically exceed it. Accepting bodies up to
eight megabytes leaves comfortable headroom.

## Secret

If the secret field is non empty, the client sends it verbatim on every request:

```http
X-Pericles-Secret: <the value typed by the user>
```

A server that expects a secret and receives a wrong one, or none, answers `401` or `403`. A server
that expects none ignores the header.

This is **not a security boundary, and must not be presented as one.** The value is stored in
`localStorage` in clear text, and is readable by anyone with the browser's developer tools open or
with access to the machine. It is a guard rail for an endpoint that is already private, in the same
spirit as the note about `sanitizeHtml` in `CLAUDE.md`: defence in depth for a single author site,
not a hardened mechanism.

It is also not authentication in the sense the site refuses to have. There is no account, no role and
no session, and the secret identifies a deployment rather than a person. Anyone reaching a configured
browser can still read and edit everything, exactly as before.

If the endpoint needs to be genuinely protected, put it behind a VPN, a private network, a
client certificate or an authenticating reverse proxy. Do not rely on this header.

## Concurrency

Conflict handling is best effort, and built entirely on standard HTTP:

1. On `GET`, the client stores the `ETag` the server returned, if any.
2. On the next `PUT`, it sends that value as `If-Match`.
3. A `412` tells the client the remote snapshot moved on. It reports a conflict, and offers a
   deliberate overwrite, which is the one request that omits `If-Match`.

A server that returns no `ETag` gets last write wins, and the client never sends `If-Match`. That is
an acceptable trade for a single author site. Any opaque, changing string works as an `ETag`: a
counter, a file modification time, a hash of the body.

## CORS

The site is served from its own origin and the service almost certainly is not, so the server must
opt in to cross origin access:

- `Access-Control-Allow-Origin`, set to the site's origin.
- A preflight `OPTIONS` handler on the dataset path, allowing the `PUT` method and the
  `Content-Type`, `X-Pericles-Secret` and `If-Match` request headers.
- `Access-Control-Expose-Headers: ETag`. Without it the browser hides the `ETag` from JavaScript, and
  conditional writes silently degrade to last write wins.

No cookies or credentials are sent, so `Access-Control-Allow-Credentials` is not needed and
`Access-Control-Allow-Origin: *` remains usable if the endpoint is otherwise protected.

## Errors, and how the client reacts

The client reduces every outcome to one of seven causes. They never leave the code, so they are named
in English, and each maps to a French sentence written in the component that displays it, since the
project has no message catalogue.

| Cause         | Trigger                                                    |
| ------------- | ---------------------------------------------------------- |
| `network`     | Connection refused, DNS failure, CORS, timeout after 15 s   |
| `refused`     | `401` or `403`, so a wrong or missing secret                 |
| `missing`     | `404` on a read, so no snapshot stored yet                   |
| `unsupported` | `404` or `405` on a write, so no endpoint at this path       |
| `conflict`    | `412`, so the remote snapshot moved on                      |
| `unreadable`  | Body is not JSON, or not an object                          |
| `server`      | Any other non `2xx` status                                 |

None of them touches the local overlay. A failed request leaves the local content exactly as it was,
and restoring only writes to `localStorage` once a readable snapshot has been fully parsed and
normalised.

A browser cannot distinguish a CORS rejection from a network outage: both surface as a failed `fetch`
with no status. A restore that fails with `network` against a server known to be up is almost always a
missing CORS header, or a request the server never answered.

## Reserved paths

`{baseUrl}/snapshots` and `{baseUrl}/snapshots/{id}` are reserved for a future snapshot history, and
a server must not use them for anything else. The current client never calls them, and a server is
free to omit them entirely.
