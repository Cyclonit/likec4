import { describe } from 'vitest'
import { test } from './asserts'

describe('02 Model', () => {
  test('name on the right side').valid`
    specification {
      element person
    }
    model {
      person user1
      person user2
    }`

  test('name on the left side').valid`
    specification {
      element person
    }
    model {
      user1 = person
      user2 = person
    }`

  test('allow element with kind "element"').valid`
    specification {
      element element
    }
    model {
      element el1
      element el2
    }`

  test('element with title').valid`
    specification {
      element person
    }
    model {
      person user1 'Person1'
      user2 = person 'Person2'
      user3 = person // unnamed
    }`

  test('element with style').valid`
    specification {
      element person
    }
    model {
      user1 = person {
        style {
          shape person
          color secondary
        }
      }
      user2 = person
    }`

  test('element with tags').valid`
    specification {
      element person
      tag one
      tag two
      tag three
    }
    model {
      user1 = person {
        #one
      }
      user2 = person {
        #one #two
      }
      user3 = person {
        #one, #two
        title 'Person3'
      }
      user4 = person {
        #one, #two
        #three
        title 'Person4'
      }
    }`

  test('fail if name is string').invalid`
    specification {
      element person
    }
    model {
      person 'Person2'
    }
    `

  test('fail if name starts with number').invalid`
    specification {
      element person
    }
    model {
      person 1person
    }
    `

  test('fail if space after dash').invalid`
    specification {
      element person
      tag one
    }
    model {
      user1 = person {
        # one
      }
    }`

  test('fail if comma left after tag').invalid`
    specification {
      element person
      tag one
    }
    model {
      user1 = person {
        #one,
      }
    }`

  test('element with nested elements').valid`
    specification {
      element person
      element system
      element component
    }
    model {
      person user1
      user2 = person {
      }
      user3 = person 'Person3'
      component system {
        subsystem = component
        backend = component {
          api = component 'API'
        }
      }
    }`

  test('fail if nested element name is string').invalid`
    specification {
      element person
      element component
    }
    model {
      person user1
      component system {
        component 'Subsystem'
        component backend
      }
    }
    `

  test('element with properties').valid`
    specification {
      element component
      tag one
    }
    model {
      component system {
        #one

        component subsystem {
          title: 'SubSystem';
          description 'Handles subsystem logic';
        }

        component storage {
          title 'Storage'
          style {
            shape: storage
          }
        }
      }
    }`

  test('element with icon').valid`
    specification {
      element component
    }
    model {
      component system {
        style {
          icon: https://icons.terrastruct.com/dev%2Ftypescript.svg
        }
      }
    }`
})
