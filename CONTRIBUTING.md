# Contributing to Futen

## Table of Contents

- [Contributing to Futen](#contributing-to-futen)
  - [Table of Contents](#table-of-contents)
  - [Suggesting Features](#suggesting-features)
    - [Before Submitting a Feature](#before-submitting-a-feature)
  - [Styleguides](#styleguides)
    - [Commit Messages](#commit-messages)

## Suggesting Features

This section guides you through submitting an enhancement suggestion for Futen, **including completely new features and minor improvements to existing functionality**. Following these guidelines will help other maintainers to understand your suggestion and find related suggestions.

### Before Submitting a Feature
* * *
- Make sure that you are starting from the latest `build/develop`.
- Read the [documentation](./README.md#documentation) carefully and find out if the functionality is already covered, maybe by an individual configuration.

## Styleguides
### Commit Messages
* * *
Read [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/#summary) [Full Specifications](https://www.conventionalcommits.org/en/v1.0.0/#specification) for more information on the conventions to follow while committing.

The commit contains the following structural elements, to communicate intent to the other maintainers of the project:

1.  **fix:** a commit of the _type_ `fix` patches a bug in your codebase (this correlates with [`PATCH`](http://semver.org/#summary) in Semantic Versioning).
2.  **feat:** a commit of the _type_ `feat` introduces a new feature to the codebase (this correlates with [`MINOR`](http://semver.org/#summary) in Semantic Versioning).
3.  **BREAKING CHANGE:** a commit that has a footer `BREAKING CHANGE:`, or appends a `!` after the type/scope, introduces a breaking API change (correlating with [`MAJOR`](http://semver.org/#summary) in Semantic Versioning). A BREAKING CHANGE can be part of commits of any _type_.
4.  _types_ other than `fix:` and `feat:` are allowed, for example [@commitlint/config-conventional](https://github.com/conventional-changelog/commitlint/tree/master/%40commitlint/config-conventional) (based on the [Angular convention](https://github.com/angular/angular/blob/22b96b9/CONTRIBUTING.md#-commit-message-guidelines)) recommends `build:`, `chore:`, `ci:`, `docs:`, `style:`, `refactor:`, `perf:`, `test:`, and others.
5.  _footers_ other than `BREAKING CHANGE: <description>` may be provided and follow a convention similar to [git trailer format](https://git-scm.com/docs/git-interpret-trailers).

Additional types are not mandated by the Conventional Commits specification, and have no implicit effect in Semantic Versioning (unless they include a BREAKING CHANGE). A scope may be provided to a commit’s type, to provide additional contextual information and is contained within parenthesis, e.g., `feat(parser): add ability to parse arrays`.