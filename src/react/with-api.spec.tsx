import React from 'react'

import {render} from '@testing-library/react'

import {withApi} from './with-api'

it('renders', () => {
  const MyComponent = withApi((props: any) => {
    if (!props.api) {
      return null
    }

    return <div>Api is passed as prop</div>
  })

  const {getByText} = render(<MyComponent />)

  expect(getByText('Api is passed as prop')).toBeInTheDocument()
})
