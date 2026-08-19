/// <reference types="node" />
import * as fs from 'node:fs';
import * as path from 'node:path';
import { HttpResourcePlugin } from '@ng-openapi/http-resource';
import type { GeneratorConfig } from 'ng-openapi';

const defaultSwaggerPath = fs.existsSync(path.resolve(process.cwd(), '../backend/swagger.json'))
  ? path.resolve(process.cwd(), '../backend/swagger.json')
  : path.resolve(process.cwd(), 'backend/swagger.json');

const swaggerInput =
  process.env['SWAGGER_FILE'] ||
  (fs.existsSync(defaultSwaggerPath) ? defaultSwaggerPath : null) ||
  process.env['SWAGGER_URL'] ||
  (process.env['BACKEND_INTERNAL_URL']
    ? `${process.env['BACKEND_INTERNAL_URL']}/swagger-json`
    : 'http://localhost:2400/swagger-json');

const config: GeneratorConfig = {
  input: swaggerInput,
  output: './src/client',
  plugins: [HttpResourcePlugin],
  options: {
    dateType: 'Date',
    enumStyle: 'enum',
  },
};

export default config;
