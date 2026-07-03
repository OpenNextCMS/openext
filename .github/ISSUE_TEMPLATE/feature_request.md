name: 💡 Feature Request
description: Suggest a new feature or enhancement for OpenNext CMS
title: "[Feature]: "
labels: [enhancement]
assignees: ''

body:
  - type: markdown
    attributes:
      value: |
        Thanks for taking the time to suggest a feature!
  - type: input
    id: feature-name
    attributes:
      label: Feature Name
      placeholder: e.g. Drag and Drop Block Editor
  - type: textarea
    id: description
    attributes:
      label: Description
      description: Describe your idea and what problem it solves.
    validations:
      required: true
  - type: textarea
    id: usecase
    attributes:
      label: Use Case
      description: Why is this feature needed? How will it help users?
  - type: textarea
    id: additional-context
    attributes:
      label: Additional Context
      description: Add any screenshots, links, references here.
