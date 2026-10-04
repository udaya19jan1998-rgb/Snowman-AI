import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CodeCard from './CodeCard';
test.each(['html', 'css', 'javascript', 'c++', 'c#', ''])('copies exact source without %s metadata', async language => {
  const code = '  first line\n\n    second line\n';
  const writeText = jest.fn().mockResolvedValue();
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: {
      writeText
    }
  });
  render(<CodeCard language={language} code={code} />);
  fireEvent.click(screen.getByRole('button', {
    name: 'Copy code'
  }));
  await waitFor(() => expect(writeText).toHaveBeenCalledWith(code));
  expect(await screen.findByText('Copied!')).toBeInTheDocument();
});
test('only the selected code card reports copied', async () => {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: {
      writeText: jest.fn().mockResolvedValue()
    }
  });
  render(<><CodeCard language="html" code="<h1>Hello</h1>" /><CodeCard language="css" code="h1 { color: red; }" /></>);
  fireEvent.click(screen.getAllByRole('button', {
    name: 'Copy code'
  })[0]);
  expect(await screen.findByText('Copied!')).toBeInTheDocument();
  expect(screen.getAllByRole('button', {
    name: 'Copy code'
  })).toHaveLength(1);
});
