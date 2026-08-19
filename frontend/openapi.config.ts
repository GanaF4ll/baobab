/// <reference types="node" />
import { HttpResourcePlugin } from '@ng-openapi/http-resource';
import type { GeneratorConfig } from 'ng-openapi';

const swaggerUrl =
  process.env['SWAGGER_URL'] ||
  (process.env['BACKEND_INTERNAL_URL']
    ? `${process.env['BACKEND_INTERNAL_URL']}/swagger-json`
    : 'http://localhost:2400/swagger-json');

const config: GeneratorConfig = {
  input: swaggerUrl,
  output: './src/client',
  plugins: [HttpResourcePlugin],
  options: {
    dateType: 'Date',
    enumStyle: 'enum',
  },
};

export default config;
