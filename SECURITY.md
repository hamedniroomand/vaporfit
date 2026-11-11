# Security Policy

## Supported versions

Security fixes go into the latest release. Please upgrade before reporting.

## Reporting a vulnerability

Please do not open a public issue for a security problem.

Report it privately through [GitHub's private vulnerability reporting](https://github.com/hamedniroomand/vaporfit/security/advisories/new). Include what you found, how to reproduce it, and what an attacker could do with it.

You should get a reply within a week. Once a fix is ready, it is released and the advisory is published with credit to you, unless you prefer to stay anonymous.

## What counts

vaporfit runs on your machine and in CI. It reads the project and parses Vue single-file components. It does not start the application. Examples of issues we want to hear about:

- Reading or writing files outside the project it checks.
- A crafted project file causing code execution while vaporfit parses it.

A wrong Vapor result is a bug, not a vulnerability. Please [open an issue](https://github.com/hamedniroomand/vaporfit/issues/new/choose) for those.
