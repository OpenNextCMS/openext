name: 🐞 Bug Report
description: File a bug/issue report for OpenNext CMS
title: "[Bug]: "
labels: [bug]
assignees: ''

body:
  - type: markdown
    attributes:
      value: |
        Thanks for reporting a bug! Please provide all required details below.
  - type: input
    id: environment
    attributes:
      label: Environment
      description: OS, browser, Node version, etc.
      placeholder: e.g. Ubuntu 22.04, Chrome v112, Node v18
    validations:
      required: true
  - type: textarea
    id: what-happened
    attributes:
      label: What happened?
      description: A clear and concise description of the bug.
    validations:
      required: true
  - type: textarea
    id: steps-to-reproduce
    attributes:
      label: Steps to Reproduce
      description: Step-by-step guide to reproduce the bug.
      placeholder: |
        1. Go to '...'
        2. Click on '....'
        3. Scroll down to '....'
        4. See error
  - type: textarea
    id: screenshots
    attributes:
      label: Screenshots (if applicable)
      description: Drag and drop images or paste screenshots here.
  - type: textarea
    id: logs
    attributes:
      label: Logs / Console Output
      render: shell
  - type: dropdown
    id: severity
    attributes:
      label: Severity
      options:
        - Low
        - Medium
        - High
        - Critical
