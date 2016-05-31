//@flow

let tests: Array<TestCase> = []
let RCTContext: ReactElement = null
let props:any = {}
let timeout = 3000

export default class TestContext {

  static setTimeout (val) {
    timeout = val
  }

  static config(config) {
    return TestContext.describe.bind(config)
  }

  /**
   * Calling this method will push a test case into task queue.
   * @param  {String}   desc Description of test case.
   * @param  {Function:Promise<any>} fn   Body of test case, this function
   *         should return a promise.
   * @return {void}
   */
  static describe (desc:string, fn:Promise<any>) {
    let { group, timeout, expand, run } = this || {}

    let ctx = {
      group : group || 'common',
      status : 'waiting',
      run : run === false ? false : true,
      result : null,
      asserts : [],
      timeout : timeout || 3000,
      expired : false,
      running : false,
      executed : false,
      expand : expand || false,
      desc,
      fn,
      sn : tests.length,
      start : (i) => {
        TestContext.startTest.bind(
          tests[i],
          TestContext.update.bind(TestContext, i),
          TestContext.updateInternal.bind(TestContext, i)
        )()
      }
    }
    tests.push(ctx)

  }

  static prop (name:string, val:any):TestContext {
    if(name === undefined && val === undefined)
      return props
    if(val === undefined)
      return props[name]
    props[name] = val
    return TestContext
  }

  /**
   * Run test cases in sequence.
   * @param  {ReactElement} context ReactElement instance context.
   * @return {void}
   */
  static run (context:ReactElement) {
    RCTContext = context
    let promise = Promise.resolve()
    // run test case sequently
    for(let i in tests) {
      if(tests[i].run === false) {
        tests[i].status = 'skipped'
        tests[i].executed = true
        promise = Promise.resolve()
        continue
      }
      promise = promise.then(
        TestContext.startTest.bind(
          tests[i],
          TestContext.update.bind(TestContext, i),
          TestContext.updateInternal.bind(TestContext, i)
      ))
    }
    return promise
  }

  static startTest(update, updateInternal, data) {
    return new Promise((resolve, reject) => {

      let expired = false
      updateInternal({
        running : true,
      })

      // set timeout timer
      let tm = setTimeout(() => {
        updateInternal({
          expired : true,
          executed : true,
          running : false
        })
        resolve('ETIMEOUT')
      }, this.timeout)

      // run test body
      new Promise((done) => {
        this.fn.bind(this)(update, done)
      })
      .then((...res) => {
        if(!expired) {
          clearTimeout(tm)
          updateInternal({
            executed : true,
            running : false
          })
          resolve(...res)
        }
      }).catch((err) => {
        updateInternal({
          executed : true,
          running : false
        })
      })

    })
  }

  /**
   * Update test task result of given index.
   * @param  {number} i       Index of test case to be updated.
   * @param  {ReactElement<Info | Assert>} ...data Assertion or Info of test.
   * @return {void}
   */
  static update(i, ...data) {
    let test = tests[i]
    let result = test.result || []
    Object.assign(test, {result : [...result, ...data]})
    RCTContext.forceUpdate()
  }

  static getTests() {
    return tests
  }

  /**
   * Update test result for testkit internal use
   * @param  {[type]} i      Index of test case to be updated.
   * @param  {TestCaseContext} result Test case object
   * @return {void}
   */
  static updateInternal(i, result) {
    Object.assign(tests[i], result)
    RCTContext.forceUpdate()
  }

}