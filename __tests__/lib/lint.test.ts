describe('Lint Config', () => {
  it('should have ESLint configuration file', () => {
    const fs = require('fs');
    expect(fs.existsSync('eslint.config.js')).toBe(true);
  });

  it('should have Prettier configuration file', () => {
    const fs = require('fs');
    expect(fs.existsSync('.prettierrc.js')).toBe(true);
  });

  it('should have Prettier ignore file', () => {
    const fs = require('fs');
    expect(fs.existsSync('.prettierignore')).toBe(true);
  });

  it('should have Husky pre-commit hook', () => {
    const fs = require('fs');
    expect(fs.existsSync('.husky/pre-commit')).toBe(true);
  });

  it('should have lint-staged configuration in package.json', () => {
    const packageJson = require('../../package.json');
    expect(packageJson['lint-staged']).toBeDefined();
    expect(packageJson['lint-staged']['*.{js,jsx,ts,tsx}']).toBeDefined();
  });

  it('should have lint scripts in package.json', () => {
    const packageJson = require('../../package.json');
    expect(packageJson.scripts.lint).toBeDefined();
    expect(packageJson.scripts['lint:fix']).toBeDefined();
    expect(packageJson.scripts.format).toBeDefined();
    expect(packageJson.scripts['format:check']).toBeDefined();
    expect(packageJson.scripts['type-check']).toBeDefined();
    expect(packageJson.scripts['code-quality']).toBeDefined();
  });

}); 