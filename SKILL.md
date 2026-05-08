### Tests

All features should have a test suite. Tests should be added to the `tests` directory in the root of the project. Each feature should have its own test file, named after the feature it tests (e.g., `feature_name_test.py`).

Tests should be written using a testing framework such as `unittest`. Each test should be self-contained and should not rely on the state of other tests. Tests should cover both typical use cases and edge cases to ensure that the feature works correctly in all scenarios.

When you update a component, you should always update the related test so it passes aswell.
