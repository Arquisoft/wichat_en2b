import io.gatling.core.Predef._
import io.gatling.http.Predef._
import scala.concurrent.duration._

class BasicSimulation extends Simulation {

  val httpProtocol = http
    .baseUrl("http://gatewayservice:8000")
    .header("Content-Type", "application/json")
    .acceptHeader("application/json")

  // Login scenario - reused by other scenarios
  val loginScenario = exec(http("Login Request")
    .post("/login")  // Changed from /api/auth/login to /login
    .body(StringBody("""{"user":{"username":"testuser","password":"password"}}"""))
    .check(jsonPath("$.token").saveAs("authToken"))
  )

  // Quiz topics scenario
  val quizTopicsScenario = scenario("Get Quiz Topics")
    .exec(loginScenario)
    .pause(1)
    .exec(http("Get Quiz Topics")
      .get("/quiz/allTopics")
      .header("Authorization", "Bearer ${authToken}")
      .check(status.is(200))
    )

  setUp(
    quizTopicsScenario.inject(
      rampUsers(50).during(30.seconds)
    )
  ).protocols(httpProtocol)
}
