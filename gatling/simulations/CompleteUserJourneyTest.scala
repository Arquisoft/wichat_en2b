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

  setUp(
    // Simple setup with few users
    scenario("Registration Test").exec(registerScenario).inject(atOnceUsers(5))
  ).protocols(httpProtocol)
}