/**
 * API Documentation Tests
 * 
 * Tests to verify API documentation files are properly structured and accessible
 */

import fs from 'fs';
import path from 'path';

describe('API Documentation', () => {
  const docsDir = path.join(__dirname, '../docs/api');

  test('OpenAPI specification file exists', () => {
    const openApiPath = path.join(docsDir, 'openapi.yaml');
    expect(fs.existsSync(openApiPath)).toBe(true);
  });

  test('Swagger UI HTML file exists', () => {
    const htmlPath = path.join(docsDir, 'index.html');
    expect(fs.existsSync(htmlPath)).toBe(true);
  });

  test('API README file exists', () => {
    const readmePath = path.join(docsDir, 'README.md');
    expect(fs.existsSync(readmePath)).toBe(true);
  });

  test('Implementation guide exists', () => {
    const implPath = path.join(docsDir, 'IMPLEMENTATION.md');
    expect(fs.existsSync(implPath)).toBe(true);
  });

  test('OpenAPI specification is valid YAML', () => {
    const openApiPath = path.join(docsDir, 'openapi.yaml');
    const content = fs.readFileSync(openApiPath, 'utf8');
    
    // Basic YAML structure validation
    expect(content).toContain('openapi: 3.0.3');
    expect(content).toContain('info:');
    expect(content).toContain('paths:');
    expect(content).toContain('components:');
  });

  test('HTML file contains Swagger UI references', () => {
    const htmlPath = path.join(docsDir, 'index.html');
    const content = fs.readFileSync(htmlPath, 'utf8');
    
    expect(content).toContain('swagger-ui');
    expect(content).toContain('openapi.yaml');
    expect(content).toContain('SwaggerUIBundle');
  });

  test('Package.json contains documentation scripts', () => {
    const packagePath = path.join(__dirname, '../package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    expect(packageJson.scripts).toHaveProperty('docs:validate');
    expect(packageJson.scripts).toHaveProperty('docs:serve');
    expect(packageJson.scripts).toHaveProperty('docs:bundle');
  });

  test('OpenAPI specification contains all required sections', () => {
    const openApiPath = path.join(docsDir, 'openapi.yaml');
    const content = fs.readFileSync(openApiPath, 'utf8');
    
    // Check for main API sections
    expect(content).toContain('/auth/v1/token');
    expect(content).toContain('/rest/v1/products');
    expect(content).toContain('/rest/v1/sales');
    expect(content).toContain('/rest/v1/roles');
    expect(content).toContain('/rest/v1/low-stock');
    
    // Check for schemas
    expect(content).toContain('Product:');
    expect(content).toContain('SalesTransaction:');
    expect(content).toContain('User:');
    expect(content).toContain('Role:');
  });

  test('README references API documentation correctly', () => {
    const readmePath = path.join(__dirname, '../README.md');
    const content = fs.readFileSync(readmePath, 'utf8');
    
    expect(content).toContain('API Documentation');
    expect(content).toContain('docs:serve');
    expect(content).toContain('docs/api/README.md');
  });
});