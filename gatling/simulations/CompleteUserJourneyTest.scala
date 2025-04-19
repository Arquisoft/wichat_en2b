import io.gatling.core.Predef._
import io.gatling.http.Predef._
import scala.concurrent.duration._

class CompleteUserJourneyTest extends Simulation {

  val httpProtocol = http
    .baseUrl("http://gatewayservice:8000")
    .header("Content-Type", "application/json")
    .acceptHeader("application/json")
  
  // Basic username generation
  val feeder = Iterator.from(1).map(i => Map("username" -> s"testuser${i}", "password" -> "password123"))
  
  // Register scenario
  val registerScenario = feed(feeder)
    .exec(http("Register New User")
      .post("/adduser")
      .body(StringBody("""{"username":"${username}","password":"${password}","role":"USER"}"""))
      .check(status.in(200, 201))
    )
  
  // Login scenario
  val loginScenario = exec(http("Login Request")
    .post("/login")
    .body(StringBody("""{"user":{"username":"${username}","password":"${password}"}}"""))
    .check(jsonPath("$.token").saveAs("authToken"))
  )

  setUp(
    scenario("Registration and Login Test")
      .exec(registerScenario)
      .pause(2.seconds)
      .exec(loginScenario)
      .inject(atOnceUsers(10))
  ).protocols(httpProtocol)
}