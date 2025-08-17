import React from 'react';
import { describe, it, expect } from 'vitest';
import { axe, toHaveNoViolations } from 'jest-axe';
import { render } from '@testing-library/react';
import { Card, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Alert, AlertTitle, AlertDescription } from '../../components/ui/Alert';

// Extend expect with jest-axe matchers
expect.extend(toHaveNoViolations);

describe('UI Components Accessibility', () => {
  it('Card component should have no accessibility violations', async () => {
    const { container } = render(
      <Card>
        <CardTitle>Test Card Title</CardTitle>
        <CardContent>
          <p>This is test content for the card component.</p>
        </CardContent>
      </Card>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('Button component should have no accessibility violations', async () => {
    const { container } = render(
      <div>
        <Button>Default Button</Button>
        <Button variant="outline">Outline Button</Button>
        <Button variant="ghost">Ghost Button</Button>
        <Button disabled>Disabled Button</Button>
      </div>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('Badge component should have no accessibility violations', async () => {
    const { container } = render(
      <div>
        <Badge>Default Badge</Badge>
        <Badge variant="success">Success Badge</Badge>
        <Badge variant="warning">Warning Badge</Badge>
        <Badge variant="destructive">Error Badge</Badge>
      </div>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('Alert component should have no accessibility violations', async () => {
    const { container } = render(
      <Alert>
        <AlertTitle>Alert Title</AlertTitle>
        <AlertDescription>
          This is an alert description that provides important information.
        </AlertDescription>
      </Alert>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('Complex form layout should have no accessibility violations', async () => {
    const { container } = render(
      <Card>
        <CardTitle>Billing Information</CardTitle>
        <CardContent>
          <form>
            <div className="space-y-4">
              <div>
                <label htmlFor="plan-select" className="block text-sm font-medium mb-1">
                  Current Plan
                </label>
                <Badge id="plan-select">Business Plan</Badge>
              </div>
              
              <div className="space-y-2">
                <Button type="submit">Upgrade Plan</Button>
                <Button variant="outline" type="button">
                  Manage Billing
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
