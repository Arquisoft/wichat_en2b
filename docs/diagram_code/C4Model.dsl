workspace "Wichat 2EM" "C4 model for building block view"

    !identifiers hierarchical

    model {
        u = person "User"
        wc = softwareSystem "Wichat EN2B" {
            webapp = container "Web Application"
            gatewayService = container "Gateway Service"
            docs = container "Documentation System"
            llmService = container "LLM Service"
            userGateway = container "User Gateway"
            userDataService = container "User CRUD Service"
            authService = container "User Authentication Service"
            gameService = container "Game Service"
            db = container "MongoDB Database" {
                tags "Database"
            }
        }
        wd = softwareSystem "WikiData"
        llm = softwareSystem "LLM"

        u -> wc "Uses"
        wc -> wd "Gets information for questions"
        wc -> llm "Asks for hints"
        wc.llmService -> llm "LLM ask API call"
        u -> wc.webapp "Uses"
        wc.webapp -> wc.gatewayService "Makes API calls"
        wc.gatewayService -> wc.llmService "LLM ask API call"
        wc.gatewayService -> wc.userGateway "User related API calls"
        wc.gatewayService -> wc.gameService "Question API calls"
        wc.gameService -> wd "Question batches API calls"
        wc.userGateway -> wc.userDataService "CRUD API calls"
        wc.userGateway -> wc.authService "Authentication API calls"
        wc.userDataService -> wc.db "User CRUD operations"
        wc.authService -> wc.db "User authentication operations"
    }
    
    views {
        systemContext wc "Diagram1" {
            include *
            autolayout lr
        }
        
        container wc "Diagram2" {
            include *
            autolayout lr
        }
        
        styles {
            element "Element" {
                color white
            }
            element "Container" {
                background #ff9933   
            }
            element "Person" {
                background #116611
                shape person
            }
            element "Software System" {
                background #2D882D
            }
            element "Database" {
                shape cylinder
            }
        }
    }

    
}