import { render, screen } from '@testing-library/react-native';

import TodayScreen from '../app/(tabs)/index';

describe('TodayScreen', () => {
  it('renders', async () => {
    await render(<TodayScreen />);
    expect(screen.getByText('Today')).toBeTruthy();
  });
});
