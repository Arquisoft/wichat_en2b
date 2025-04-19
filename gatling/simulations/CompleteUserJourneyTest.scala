import io.gatling.core.Predef._
import io.gatling.http.Predef._
import scala.concurrent.duration._

class CompleteUserJourneyTest extends Simulation {

  val httpProtocol = http
    .baseUrl("http://gatewayservice:8000")
    .header("Content-Type", "application/json")
    .acceptHeader("application/json")

  setUp(
  ).protocols(httpProtocol)
}