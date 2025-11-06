https://tsoa-community.github.io/docs/getting-started.html
https://tsoa-community.github.io/docs/generating.html
https://tsoa-community.github.io/docs/live-reloading.html
https://tsoa-community.github.io/docs/error-handling.html
https://tsoa-community.github.io/docs/descriptions.html
https://tsoa-community.github.io/docs/examples.html
https://tsoa-community.github.io/docs/annotations.html
https://tsoa-community.github.io/docs/custom-middlewares.html
https://tsoa-community.github.io/docs/di.html
https://tsoa-community.github.io/docs/authentication.html
https://tsoa-community.github.io/docs/decorators.html

Always stay as close as possible to the tsoa docs. Use the api.yaml as the reference of the api.

Run pnpm test:ci to verify changes

## Lessons Learned

### Configuration
- `tsoa.json`: Use `routesDir` (not `outputDirectory`) for routes, `authenticationModule` path excludes `.ts`
- `@Route("")` for controllers at basePath level (basePath in tsoa.json handles v1 prefix)
- Always regenerate routes after changing decorators: `npx tsoa routes`

### Authentication
- Manually add authentication import to generated routes.ts (tsoa doesn't auto-import)
- Mark auth errors with `error.isAuthError = true` for proper error handler routing
- Use `@Request() req: any` + `req.user` for accessing authenticated user (not `@Inject()`)
- Return 401 for missing auth, 403 for invalid credentials

### Error Handling
- ValidateError paths need "body." prefix stripping: `field.replace(/^body\./, '')`
- Include `req.baseUrl + req.path` for full error paths in mounted routers
- Separate validation errors (400) from auth errors (401/403) in handler

### Type Definitions
- Define all request/response types in `server/types.ts`
- Allow null for optional fields: `activationLimit: number | null`
- Required fields in interfaces match tsoa validation strictness

### Testing
- Tests expect specific error response formats (path: `/body/fieldName`)
- Success status codes matter: match decorator (201 vs 200)
- Run full test suite before considering setup complete
