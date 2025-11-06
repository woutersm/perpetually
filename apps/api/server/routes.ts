/* tslint:disable */
/* eslint-disable */
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import type { TsoaRoute } from '@tsoa/runtime';
import {  fetchMiddlewares, ExpressTemplateService } from '@tsoa/runtime';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { LicenseController } from './controllers/LicenseController';
import type { Request as ExRequest, Response as ExResponse, RequestHandler, Router } from 'express';
// Import authentication module for expressAuthenticationRecasted
import { expressAuthentication } from './authentication';
const expressAuthenticationRecasted = expressAuthentication as any;



// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

const models: TsoaRoute.Models = {
    "LicenseDetails": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"string","required":true},
            "key": {"dataType":"string","required":true},
            "createdAt": {"dataType":"union","subSchemas":[{"dataType":"datetime"},{"dataType":"string"}],"required":true},
            "expiresAt": {"dataType":"union","subSchemas":[{"dataType":"datetime"},{"dataType":"string"}],"required":true},
            "activations": {"dataType":"double","required":true},
            "activationLimit": {"dataType":"double","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ValidateResponse": {
        "dataType": "refObject",
        "properties": {
            "valid": {"dataType":"boolean","required":true},
            "error": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "license": {"ref":"LicenseDetails"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ValidateRequest": {
        "dataType": "refObject",
        "properties": {
            "licenseId": {"dataType":"string","required":true},
            "key": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ActivationDetails": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"string","required":true},
            "createdAt": {"dataType":"union","subSchemas":[{"dataType":"datetime"},{"dataType":"string"}],"required":true},
            "updatedAt": {"dataType":"union","subSchemas":[{"dataType":"datetime"},{"dataType":"string"}],"required":true},
            "teamId": {"dataType":"string","required":true},
            "name": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "licenseId": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ActivateResponse": {
        "dataType": "refObject",
        "properties": {
            "activated": {"dataType":"boolean","required":true},
            "error": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "activation": {"ref":"ActivationDetails"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ActivateRequest": {
        "dataType": "refObject",
        "properties": {
            "licenseId": {"dataType":"string","required":true},
            "name": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CreatedLicense": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"string","required":true},
            "createdAt": {"dataType":"union","subSchemas":[{"dataType":"datetime"},{"dataType":"string"}],"required":true},
            "updatedAt": {"dataType":"union","subSchemas":[{"dataType":"datetime"},{"dataType":"string"}],"required":true},
            "expiresAt": {"dataType":"union","subSchemas":[{"dataType":"datetime"},{"dataType":"string"}],"required":true},
            "status": {"dataType":"string","required":true},
            "keyCreatedAt": {"dataType":"union","subSchemas":[{"dataType":"datetime"},{"dataType":"string"}],"required":true},
            "key": {"dataType":"string","required":true},
            "activationLimit": {"dataType":"union","subSchemas":[{"dataType":"double"},{"dataType":"enum","enums":[null]}],"required":true},
            "productId": {"dataType":"string","required":true},
            "teamId": {"dataType":"string","required":true},
            "customerId": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CreateLicenseResponse": {
        "dataType": "refObject",
        "properties": {
            "created": {"dataType":"boolean","required":true},
            "error": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "license": {"ref":"CreatedLicense"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CreateLicenseRequest": {
        "dataType": "refObject",
        "properties": {
            "productId": {"dataType":"string","required":true},
            "name": {"dataType":"string","required":true},
            "email": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "DeactivateResponse": {
        "dataType": "refObject",
        "properties": {
            "deactivated": {"dataType":"boolean","required":true},
            "error": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "activation": {"dataType":"enum","enums":[null],"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "DeactivateRequest": {
        "dataType": "refObject",
        "properties": {
            "activationId": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
};
const templateService = new ExpressTemplateService(models, {"noImplicitAdditionalProperties":"throw-on-extras","bodyCoercion":true});

// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa




export function RegisterRoutes(app: Router) {

    // ###########################################################################################################
    //  NOTE: If you do not see routes for all of your controllers in this file, then you might not have informed tsoa of where to look
    //      Please look into the "controllerPathGlobs" config option described in the readme: https://github.com/lukeautry/tsoa
    // ###########################################################################################################


    
        const argsLicenseController_validate: Record<string, TsoaRoute.ParameterSchema> = {
                body: {"in":"body","name":"body","required":true,"ref":"ValidateRequest"},
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.post('/v1/validate',
            authenticateMiddleware([{"bearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(LicenseController)),
            ...(fetchMiddlewares<RequestHandler>(LicenseController.prototype.validate)),

            async function LicenseController_validate(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsLicenseController_validate, request, response });

                const controller = new LicenseController();

              await templateService.apiHandler({
                methodName: 'validate',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsLicenseController_activate: Record<string, TsoaRoute.ParameterSchema> = {
                body: {"in":"body","name":"body","required":true,"ref":"ActivateRequest"},
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.post('/v1/activate',
            authenticateMiddleware([{"bearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(LicenseController)),
            ...(fetchMiddlewares<RequestHandler>(LicenseController.prototype.activate)),

            async function LicenseController_activate(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsLicenseController_activate, request, response });

                const controller = new LicenseController();

              await templateService.apiHandler({
                methodName: 'activate',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsLicenseController_createLicense: Record<string, TsoaRoute.ParameterSchema> = {
                body: {"in":"body","name":"body","required":true,"ref":"CreateLicenseRequest"},
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.post('/v1/licenses',
            authenticateMiddleware([{"bearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(LicenseController)),
            ...(fetchMiddlewares<RequestHandler>(LicenseController.prototype.createLicense)),

            async function LicenseController_createLicense(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsLicenseController_createLicense, request, response });

                const controller = new LicenseController();

              await templateService.apiHandler({
                methodName: 'createLicense',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsLicenseController_deactivate: Record<string, TsoaRoute.ParameterSchema> = {
                body: {"in":"body","name":"body","required":true,"ref":"DeactivateRequest"},
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.post('/v1/deactivate',
            authenticateMiddleware([{"bearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(LicenseController)),
            ...(fetchMiddlewares<RequestHandler>(LicenseController.prototype.deactivate)),

            async function LicenseController_deactivate(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsLicenseController_deactivate, request, response });

                const controller = new LicenseController();

              await templateService.apiHandler({
                methodName: 'deactivate',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa


    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

    function authenticateMiddleware(security: TsoaRoute.Security[] = []) {
        return async function runAuthenticationMiddleware(request: any, response: any, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            // keep track of failed auth attempts so we can hand back the most
            // recent one.  This behavior was previously existing so preserving it
            // here
            const failedAttempts: any[] = [];
            const pushAndRethrow = (error: any) => {
                failedAttempts.push(error);
                throw error;
            };

            const secMethodOrPromises: Promise<any>[] = [];
            for (const secMethod of security) {
                if (Object.keys(secMethod).length > 1) {
                    const secMethodAndPromises: Promise<any>[] = [];

                    for (const name in secMethod) {
                        secMethodAndPromises.push(
                            expressAuthenticationRecasted(request, name, secMethod[name], response)
                                .catch(pushAndRethrow)
                        );
                    }

                    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

                    secMethodOrPromises.push(Promise.all(secMethodAndPromises)
                        .then(users => { return users[0]; }));
                } else {
                    for (const name in secMethod) {
                        secMethodOrPromises.push(
                            expressAuthenticationRecasted(request, name, secMethod[name], response)
                                .catch(pushAndRethrow)
                        );
                    }
                }
            }

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            try {
                request['user'] = await Promise.any(secMethodOrPromises);

                // Response was sent in middleware, abort
                if (response.writableEnded) {
                    return;
                }

                next();
            }
            catch(err) {
                // Show most recent error as response
                const error = failedAttempts.pop();
                error.status = error.status || 401;

                // Response was sent in middleware, abort
                if (response.writableEnded) {
                    return;
                }
                next(error);
            }

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        }
    }

    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
}

// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
