
import * as fs from 'fs';
import * as path from 'path';
import { solutionJsonSchema } from '../src/schemas/solutions';
import { partnerJsonSchema } from '../src/schemas/partners';
import { userJsonSchema } from '../src/schemas/users';
import { ticketJsonSchema } from '../src/schemas/tickets';

const openApiSpec = {
    openapi: '3.0.0',
    info: {
        title: 'Impact Collaboration Platform API',
        version: '1.0.0',
        description: 'API for the Impact Collaboration Platform (DPG Candidate).',
        license: {
            name: 'Apache 2.0',
            url: 'https://www.apache.org/licenses/LICENSE-2.0.html'
        }
    },
    servers: [
        {
            url: 'http://localhost:3000/v1',
            description: 'Local Development Server'
        }
    ],
    components: {
        schemas: {
            Solution: solutionJsonSchema,
            Partner: partnerJsonSchema,
            User: userJsonSchema,
            Ticket: ticketJsonSchema
        },
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT'
            }
        }
    },
    security: [
        {
            bearerAuth: []
        }
    ],
    paths: {
        '/solutions': {
            get: {
                summary: 'List Solutions',
                responses: {
                    '200': {
                        description: 'A list of solutions',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'array',
                                    items: { $ref: '#/components/schemas/Solution' }
                                }
                            }
                        }
                    }
                }
            },
            post: {
                summary: 'Create a Solution',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/Solution' }
                        }
                    }
                },
                responses: {
                    '201': {
                        description: 'Created Solution',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Solution' }
                            }
                        }
                    }
                }
            }
        },
        '/partners': {
            get: {
                summary: 'List Partners',
                responses: {
                    '200': {
                        description: 'A list of partners',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'array',
                                    items: { $ref: '#/components/schemas/Partner' }
                                }
                            }
                        }
                    }
                }
            },
            post: {
                summary: 'Create a Partner',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/Partner' }
                        }
                    }
                },
                responses: {
                    '201': {
                        description: 'Created Partner',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Partner' }
                            }
                        }
                    }
                }
            }
        },
        '/users': {
            get: {
                summary: 'List Users',
                responses: {
                    '200': {
                        description: 'A list of users',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'array',
                                    items: { $ref: '#/components/schemas/User' }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
};

const outputPath = path.resolve(__dirname, '../../openapi.json');
fs.writeFileSync(outputPath, JSON.stringify(openApiSpec, null, 2));
console.log(`OpenAPI spec generated at ${outputPath}`);
