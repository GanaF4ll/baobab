import { GeneratorConfig } from 'ng-openapi';

const config: GeneratorConfig = {
  input: 'http://localhost:2400/swagger-json',
  output: './src/client',
  options: {
    dateType: 'Date',
    enumStyle: 'enum',
  },
};

export default config;
