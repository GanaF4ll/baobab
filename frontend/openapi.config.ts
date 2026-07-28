import { HttpResourcePlugin } from '@ng-openapi/http-resource';
import { GeneratorConfig } from 'ng-openapi';

const config: GeneratorConfig = {
  input: 'http://localhost:2400/swagger-json',
  output: './src/client',
  plugins: [HttpResourcePlugin],
  options: {
    dateType: 'Date',
    enumStyle: 'enum',
  },
};

export default config;
