/**
 * Copyright (c) 2025 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

const fs = require('fs');
const path = require('path');
const { globSync } = require('glob');

const LICENSE_HEADER = `/**
 * Copyright (c) 2021-2025 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */`;

const SHELL_LICENSE_HEADER = `#!/bin/sh
#
# Copyright (c) 2025 Red Hat, Inc.
# This program and the accompanying materials are made
# available under the terms of the Eclipse Public License 2.0
# which is available at https://www.eclipse.org/legal/epl-2.0/
#
# SPDX-License-Identifier: EPL-2.0
#
# Contributors:
#   Red Hat, Inc. - initial API and implementation`;

const patterns = ['src/**/*.ts', 'tests/**/*.ts', 'build/dockerfiles/**/*.sh', '.config/**/*.js'];

const fix = process.argv.includes('--fix');

function checkFile(file) {
  const content = fs.readFileSync(file, 'utf8');
  const ext = path.extname(file);

  let hasLicense = false;
  let header = LICENSE_HEADER;

  if (ext === '.sh') {
    header = SHELL_LICENSE_HEADER;
    hasLicense = content.includes('SPDX-License-Identifier: EPL-2.0');
  } else {
    hasLicense = content.includes('SPDX-License-Identifier: EPL-2.0');
  }

  if (!hasLicense) {
    if (fix) {
      // Add license header
      const newContent =
        ext === '.sh'
          ? header +
            '\n\n' +
            content.replace(/^#!\/bin\/sh\n/, '').replace(/^#!\/usr\/bin\/env node\n/, '')
          : header + '\n\n' + content;
      fs.writeFileSync(file, newContent, 'utf8');
      console.log(`✅ Added license header to: ${file}`);
      return true;
    } else {
      console.error(`❌ Missing license header: ${file}`);
      return false;
    }
  }

  return true;
}

function main() {
  let allOk = true;
  let checkedFiles = 0;

  patterns.forEach(pattern => {
    const files = globSync(pattern, {
      ignore: ['**/node_modules/**', '**/dist/**', '**/*.d.ts'],
    });

    files.forEach(file => {
      checkedFiles++;
      if (!checkFile(file)) {
        allOk = false;
      }
    });
  });

  console.log(`\nChecked ${checkedFiles} files`);

  if (!allOk) {
    if (fix) {
      console.log('\n✅ All license headers have been fixed!');
      process.exit(0);
    } else {
      console.error(
        '\n❌ Some files are missing license headers. Run "yarn header:fix" to add them.'
      );
      process.exit(1);
    }
  } else {
    console.log('✅ All files have proper license headers!');
    process.exit(0);
  }
}

main();
